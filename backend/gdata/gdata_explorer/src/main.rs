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
    layout::{Constraint, Direction, Layout, Rect},
    prelude::*,
    widgets::{
        block::{Position, Title},
        Block, Clear, List, ListState, Paragraph, Wrap,
    },
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
    /// The app has been initialized and is on the home page.
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
        let node_author = node.authors().default().await?;
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
        let mut stream = node.docs().list().await?;
        while let Some(doc) = stream.next().await {
            let (doc, _cap) = doc?;
            docs.push(doc);
        }
        Ok(AppState::Home(HomePage {
            docs,
            docs_state: ListState::default().with_selected(Some(0)),
            show_help: false,
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
                    // The modulo operator doesn’t work well with negative values
                    // Hence, an if-else is required to handle wrap-around properly
                    if *selected == 0 {
                        // Cycle to the last item if already at the first
                        //`saturating_sub(n)` in used  to handle the case where len is 0, avoiding underflow
                        *selected = home.docs.len().saturating_sub(1);
                    } else {
                        *selected -= 1;
                    }
                }
                KeyCode::Down | KeyCode::Char('j') => {
                    let selected = home.docs_state.selected_mut().get_or_insert(0);
                    // The modulo operation ensure `last index % list.len() = 0`
                    // which will put the cursor to the start of the item
                    *selected = (*selected + 1) % home.docs.len();
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
                            ns: *ns,
                            entries_state: ListState::default().with_selected(Some(0)),
                            current_value,
                            entries,
                        }));
                    }
                }
                KeyCode::Char('?') => {
                    // Toggle popup visibility
                    home.show_help = !home.show_help;
                }
                _ => (),
            }
        }

        Ok(AppState::Home(home))
    }

    async fn update_doc(
        &mut self,
        mut page: NamespaceView,
        event: Event,
    ) -> anyhow::Result<AppState> {
        check_for_exit(&event)?;

        if let Event::Key(key) = event {
            #[allow(clippy::single_match)]
            match key.code {
                KeyCode::Esc => return Self::load_home(&self.node).await,
                KeyCode::Up | KeyCode::Char('k') => {
                    let selected = page.entries_state.selected_mut().get_or_insert(0);
                    if *selected == 0 {
                        *selected = page.entries.len().saturating_sub(1);
                    } else {
                        *selected -= 1;
                    }
                    let key: Key = page.entries.get(*selected).unwrap().clone();
                    page.current_value = self.graph.get_or_init_map((page.ns, key)).await?;
                }
                KeyCode::Down | KeyCode::Char('j') => {
                    let selected = page.entries_state.selected_mut().get_or_insert(0);
                    let key: Key = page.entries.get(*selected).unwrap().clone();
                    page.current_value = self.graph.get_or_init_map((page.ns, key)).await?;

                    *selected = (*selected + 1) % page.entries.len();
                }
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
    show_help: bool,
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

        let instructions = Title::from(Line::from(vec![" Help ".into(), "<?> ".blue().bold()]));
        StatefulWidget::render(
            List::new(
                self.docs
                    .iter()
                    .map(|x| Text::from(x.to_string()))
                    .collect::<Vec<_>>(),
            )
            .block(
                Block::bordered().title("Namespaces").title(
                    instructions
                        .alignment(Alignment::Center)
                        .position(Position::Bottom),
                ),
            )
            .highlight_style(Style::default().black().on_gray()),
            app_area,
            buf,
            &mut self.docs_state,
        );

        if self.show_help {
            let width = 40;
            let height = 30;

            // Block `app_area` to make popup text readable
            Clear::render(Clear, app_area, buf);

            let popup_area = centered_rect(width, height, area);
            let popup_content_area = centered_rect(width - 10, height - 10, area);

            Block::bordered().title("Help").render(popup_area, buf);
            let content = ["?: Toggle Help", "↑↓: Cycle List", "⏎: Open", "q: Quit"];
            let popup_content = List::new(
                content
                    .iter()
                    .map(|&help| Text::from(help))
                    .collect::<Vec<_>>(),
            )
            .block(Block::default());
            Widget::render(&popup_content, popup_content_area, buf);
        }
    }
}

struct NamespaceView {
    ns: NamespaceId,
    entries: Vec<Key>,
    entries_state: ListState,
    current_value: GStoreValue<IrohGStore>,
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
            .block(Block::bordered())
            .wrap(Wrap { trim: false })
            .render(value_area, buf);

        Block::bordered().title("Value").render(value_area, buf);
    }
}

/// helper function to create a centered rect using up certain percentage of the available rect `r`
fn centered_rect(percent_x: u16, percent_y: u16, r: Rect) -> Rect {
    // Cut the given rectangle into three vertical pieces
    let popup_layout = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Percentage((100 - percent_y) / 2),
            Constraint::Percentage(percent_y),
            Constraint::Percentage((100 - percent_y) / 2),
        ])
        .split(r);

    // Then cut the middle vertical piece into three width-wise pieces
    Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Percentage((100 - percent_x) / 2),
            Constraint::Percentage(percent_x),
            Constraint::Percentage((100 - percent_x) / 2),
        ])
        .split(popup_layout[1])[1] // Return the middle chunk
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
