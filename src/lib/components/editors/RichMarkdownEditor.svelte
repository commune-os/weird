<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';

	import {
		schema as markdownSchema,
		defaultMarkdownParser,
		defaultMarkdownSerializer
	} from 'prosemirror-markdown';
	import { buildInputRules, buildKeymap } from 'prosemirror-example-setup';
	import { EditorState } from 'prosemirror-state';
	import { EditorView } from 'prosemirror-view';
	import { undo, redo, history } from 'prosemirror-history';
	import { keymap } from 'prosemirror-keymap';
	import { baseKeymap } from 'prosemirror-commands';

	import 'prosemirror-view/style/prosemirror.css';

	let { content = $bindable(), ...attrs }: { content: string } & HTMLAttributes<HTMLSpanElement> =
		$props();

	let editor: EditorView = $state() as any;

	let internalContent = $state('');
	$effect(() => {
		if (internalContent != content && editor) {
			internalContent = content;
			const len = editor.state.doc.content.size;
			const newState = editor.state.apply(
				editor.state.tr.delete(0, len).insert(0, defaultMarkdownParser.parse(internalContent))
			);
			editor.updateState(newState);
		}
	});

	function editorPlugin(el: HTMLElement) {
		let s = EditorState.create({
			schema: markdownSchema,
			doc: defaultMarkdownParser.parse(content),
			plugins: [
				buildInputRules(markdownSchema),
				history(),
				keymap({ 'Mod-z': undo, 'Mod-Shift-z': redo, 'Mod-y': redo }),
				keymap(buildKeymap(markdownSchema)),
				keymap(baseKeymap)
			]
		});
		s = s.apply(s.tr.insertText(content));
		editor = new EditorView(el, {
			state: s,
			dispatchTransaction(transaction) {
				const newState = editor.state.apply(transaction);
				internalContent = defaultMarkdownSerializer.serialize(newState.doc);
				content = internalContent;
				editor.updateState(newState);
			}
		});
	}

	export function focus() {
		editor.focus();
	}
</script>

<div use:editorPlugin {...attrs}></div>

<style>
	div :global(div[contenteditable='true']) {
		padding: 0.5em;
	}
	div :global(div[contenteditable='true']:focus) {
		outline: 1px solid white;
		outline-offset: 0.25em;
		border-radius: 0.75em;
	}
</style>
