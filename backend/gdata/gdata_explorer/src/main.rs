use std::path::{Path, PathBuf};

use clap::Parser;
use crossterm::{
    event::{DisableMouseCapture, EnableMouseCapture, Event, EventStream, KeyCode, KeyModifiers},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use futures::StreamExt;
use gdata::{GStoreBackend, GStoreValue, IrohGStore, Key};
use iroh::{docs::NamespaceId, node::FsNode};
use layout::Size;
use once_cell::sync::Lazy;
use ratatui::{
    prelude::*,
    widgets::{Block, List, ListState, Paragraph, Wrap},
};

#[derive(clap::Parser)]
pub struct Args {
    #[arg(default_value = "data", env)]
    pub data_dir: PathBuf,
}

pub static ARGS: Lazy<Args> = Lazy::new(Args::parse);
pub static RT: Lazy<tokio::runtime::Runtime> = Lazy::new(|| {
    tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()
        .unwrap()
});

/// App holds the state of the application
struct App {
    node: iroh::node::FsNode,
    size: Size,
    graph: IrohGStore,
    state: AppState,
}

#[derive(Default)]
enum AppState {
    // Temporary state
    #[default]
    None,
    /// The app has been intialized and is on the home page.
    Home(HomePage),
    Doc(NamespaceView),
}

impl AppState {
    fn take(&mut self) -> Self {
        std::mem::take(self)
    }
}

fn check_for_exit(event: &Event) -> anyhow::Result<()> {
    if let Event::Key(key) = &event {
        if key.code == KeyCode::Char('q')
            || (key.modifiers.contains(KeyModifiers::CONTROL) && key.code == KeyCode::Char('c'))
        {
            anyhow::bail!("Exiting");
        }
    }
    Ok(())
}

impl App {
    async fn new(path: &Path) -> anyhow::Result<Self> {
        let node = iroh::node::FsNode::persistent(path)
            .await?
            .node_discovery(iroh::node::DiscoveryConfig::None)
            .relay_mode(iroh::net::relay::RelayMode::Disabled)
            .spawn()
            .await?;
        let node_author = node.authors.default().await?;
        let graph = IrohGStore::new(node.client().clone(), node_author);

        let state = Self::load_home(&node).await?;
        Ok(Self {
            node,
            // node_author,
            size: Size::default(),
            graph,
            state,
        })
    }

    async fn load_home(node: &FsNode) -> anyhow::Result<AppState> {
        let mut docs = Vec::new();
        let mut stream = node.docs.list().await?;
        while let Some(doc) = stream.next().await {
            let (doc, _cap) = doc?;
            docs.push(doc);
        }
        Ok(AppState::Home(HomePage {
            docs,
            docs_state: ListState::default().with_selected(Some(0)),
        }))
    }

    async fn update(&mut self, event: Event) -> anyhow::Result<()> {
        self.state = match self.state.take() {
            AppState::None => {
                panic!("State should be replaced each update and not allowed to get to None")
            }
            AppState::Home(home) => self.update_home(home, event).await?,
            AppState::Doc(doc) => self.update_doc(doc, event).await?,
        };
        Ok(())
    }

    async fn update_home(&mut self, mut home: HomePage, event: Event) -> anyhow::Result<AppState> {
        check_for_exit(&event)?;

        if let Event::Key(key) = event {
            match key.code {
                KeyCode::Up | KeyCode::Char('k') => {
                    let selected = home.docs_state.selected_mut().get_or_insert(0);
                    *selected = (*selected + 1).min(home.docs.len())
                }
                KeyCode::Down | KeyCode::Char('j') => {
                    let selected = home.docs_state.selected_mut().get_or_insert(0);
                    *selected = selected.saturating_sub(1);
                }
                KeyCode::Enter => {
                    if let Some(ns) = home.docs.get(home.docs_state.selected().unwrap_or(0)) {
                        let current_value = self.graph.get_or_init_map((*ns, ())).await?;
                        let mut entries = Vec::new();
                        let mut stream = current_value.list_items_recursive().await?;
                        while let Some(entry) = stream.next().await {
                            let value = entry?;
                            entries.push(value.link.key);
                        }

                        return Ok(AppState::Doc(NamespaceView {
                            history: vec![current_value.clone()],
                            ns: *ns,
                            entries_state: ListState::default().with_selected(Some(0)),
                            current_value,
                            highlighted_value: match entries.first() {
                                Some(x) => Some(self.graph.get((*ns, x.clone())).await?),
                                None => None,
                            },
                            entries,
                        }));
                    }
                }
                _ => (),
            }
        }

        Ok(AppState::Home(home))
    }

    async fn update_doc(&mut self, page: NamespaceView, event: Event) -> anyhow::Result<AppState> {
        check_for_exit(&event)?;

        if let Event::Key(key) = event {
            #[allow(clippy::single_match)]
            match key.code {
                KeyCode::Esc => return Self::load_home(&self.node).await,
                _ => (),
            }
        }

        Ok(AppState::Doc(page))
    }
}

impl Widget for &mut App {
    fn render(self, area: Rect, buf: &mut Buffer)
    where
        Self: Sized,
    {
        self.size = buf.area.as_size();
        match &mut self.state {
            AppState::None => panic!("App should not be left in none state"),
            AppState::Home(home) => home.render(area, buf),
            AppState::Doc(doc) => doc.render(area, buf),
        }
    }
}

struct HomePage {
    docs: Vec<NamespaceId>,
    docs_state: ListState,
}

impl Widget for &mut HomePage {
    fn render(self, area: Rect, buf: &mut Buffer)
    where
        Self: Sized,
    {
        let layout = Layout::vertical(vec![Constraint::Max(1), Constraint::Fill(1)]);
        let [title_bar_area, app_area] = layout.areas(area);

        Line::styled("GData Explorer", Style::default().bold())
            .centered()
            .render(title_bar_area, buf);

        StatefulWidget::render(
            List::new(
                self.docs
                    .iter()
                    .map(|x| Text::from(x.to_string()))
                    .collect::<Vec<_>>(),
            )
            .block(Block::bordered().title("Namespaces"))
            .highlight_style(Style::default().black().on_gray()),
            app_area,
            buf,
            &mut self.docs_state,
        );
    }
}

struct NamespaceView {
    ns: NamespaceId,
    history: Vec<GStoreValue<IrohGStore>>,
    entries: Vec<Key>,
    entries_state: ListState,
    current_value: GStoreValue<IrohGStore>,
    highlighted_value: Option<GStoreValue<IrohGStore>>,
}

impl Widget for &mut NamespaceView {
    fn render(self, area: Rect, buf: &mut Buffer)
    where
        Self: Sized,
    {
        let layout = Layout::vertical(vec![Constraint::Max(1), Constraint::Fill(1)]);
        let [title_bar_area, app_area] = layout.areas(area);

        Line::styled(
            format!("GData Explorer ( {} )", self.ns),
            Style::default().bold(),
        )
        .centered()
        .render(title_bar_area, buf);

        let layout = Layout::horizontal(vec![Constraint::Fill(1), Constraint::Fill(1)]);
        let [document_area, value_area] = layout.areas(app_area);

        StatefulWidget::render(
            List::new(self.entries.iter().map(|x| Line::raw(format!("{x}"))))
                .highlight_style(Style::new().black().on_white())
                .block(Block::bordered().title("Key")),
            document_area,
            buf,
            &mut self.entries_state,
        );

        Paragraph::new(format!("{:#?}", self.current_value))
            .block(Block::bordered().title("Namespace"))
            .wrap(Wrap { trim: false })
            .render(value_area, buf);

        Block::bordered().title("Value").render(value_area, buf);
    }
}

fn main() -> anyhow::Result<()> {
    RT.block_on(start())
}

async fn start() -> anyhow::Result<()> {
    let app = App::new(&ARGS.data_dir).await?;

    let backend = CrosstermBackend::new(std::io::stdout());
    let mut terminal = Terminal::new(backend)?;

    // setup terminal
    enable_raw_mode()?;
    execute!(std::io::stdout(), EnterAlternateScreen, EnableMouseCapture)?;

    // create app and run it
    let res = run_app(&mut terminal, app).await;

    // restore terminal
    disable_raw_mode()?;
    execute!(
        terminal.backend_mut(),
        LeaveAlternateScreen,
        DisableMouseCapture
    )?;
    terminal.show_cursor()?;

    if let Err(err) = res {
        println!("{err:?}");
    }

    Ok(())
}

async fn run_app<B: Backend>(terminal: &mut Terminal<B>, mut app: App) -> anyhow::Result<()> {
    let mut events = EventStream::new();
    terminal.draw(|f| f.render_widget(&mut app, f.size()))?;
    loop {
        if let Some(event) = events.next().await {
            let event = event?;
            app.update(event).await?;
            terminal.draw(|f| f.render_widget(&mut app, f.size()))?;
        }
    }
}

// fn ui(f: &mut Frame, app: &App) {
//     let vertical = Layout::vertical([
//         Constraint::Length(1),
//         Constraint::Length(3),
//         Constraint::Min(1),
//     ]);
//     let [help_area, input_area, messages_area] = vertical.areas(f.size());

//     let (msg, style) = match app.input_mode {
//         InputMode::Normal => (
//             vec![
//                 "Press ".into(),
//                 "q".bold(),
//                 " to exit, ".into(),
//                 "e".bold(),
//                 " to start editing.".bold(),
//             ],
//             Style::default().add_modifier(Modifier::RAPID_BLINK),
//         ),
//         InputMode::Editing => (
//             vec![
//                 "Press ".into(),
//                 "Esc".bold(),
//                 " to stop editing, ".into(),
//                 "Enter".bold(),
//                 " to record the message".into(),
//             ],
//             Style::default(),
//         ),
//     };
//     let text = Text::from(Line::from(msg)).patch_style(style);
//     let help_message = Paragraph::new(text);
//     f.render_widget(help_message, help_area);

//     let input = Paragraph::new(app.input.as_str())
//         .style(match app.input_mode {
//             InputMode::Normal => Style::default(),
//             InputMode::Editing => Style::default().fg(Color::Yellow),
//         })
//         .block(Block::bordered().title("Input"));
//     f.render_widget(input, input_area);
//     match app.input_mode {
//         InputMode::Normal =>
//             // Hide the cursor. `Frame` does this by default, so we don't need to do anything here
//             {}

//         InputMode::Editing => {
//             // Make the cursor visible and ask ratatui to put it at the specified coordinates after
//             // rendering
//             #[allow(clippy::cast_possible_truncation)]
//             f.set_cursor(
//                 // Draw the cursor at the current position in the input field.
//                 // This position is can be controlled via the left and right arrow key
//                 input_area.x + app.character_index as u16 + 1,
//                 // Move one line down, from the border to the input line
//                 input_area.y + 1,
//             );
//         }
//     }

//     let messages: Vec<ListItem> = app
//         .messages
//         .iter()
//         .enumerate()
//         .map(|(i, m)| {
//             let content = Line::from(Span::raw(format!("{i}: {m}")));
//             ListItem::new(content)
//         })
//         .collect();
//     let messages = List::new(messages).block(Block::bordered().title("Messages"));
//     f.render_widget(messages, messages_area);
// }
