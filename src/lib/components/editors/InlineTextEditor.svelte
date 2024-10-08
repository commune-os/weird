<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';

	import { EditorState } from 'prosemirror-state';
	import { EditorView } from 'prosemirror-view';
	import { Schema } from 'prosemirror-model';
	import { defaultMarkdownSerializer } from 'prosemirror-markdown';

	const textSchema = new Schema({
		nodes: {
			text: {},
			doc: { content: 'text*' }
		}
	});

	let { content = $bindable(), ...attrs }: { content: string } & HTMLAttributes<HTMLSpanElement> =
		$props();

	let editor: EditorView = $state() as any;

	let internalContent = $state('');
	$effect(() => {
		if (internalContent != content && editor) {
			internalContent = content;
			const len = editor.state.doc.content.size;
			const newState = editor.state.apply(
				editor.state.tr.delete(0, len).insert(0, textSchema.text(internalContent))
			);
			editor.updateState(newState);
		}
	});

	function editorPlugin(el: HTMLElement) {
		let s = EditorState.create({
			schema: textSchema
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

<span use:editorPlugin {...attrs}></span>

<style>
	/* span :global(div[contenteditable='true']) {
		padding: 0.25em;
	} */
	span :global(div[contenteditable='true']:focus) {
		outline: 1px solid white;
		outline-offset: 0.25em;
		border-radius: 0.75em;
	}
</style>
