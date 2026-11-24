# Keyboard navigation

The graph explorer is usable without a mouse. This page documents the
intended keyboard flow so future changes can be checked against it.

## Opening file details

- `Tab` moves through the page: header links, the import controls, the
graph controls (search, layout, zoom), the graph nodes, and the
Modules file list.
- Graph nodes are focusable. Keyboard focus is always visible (a 3px
outline) on buttons, links, inputs, selects, and graph nodes.
- To open file details with the keyboard, open the **Modules** list,
`Tab` to a file, and press `Enter`. The details panel opens and focus
moves into it, on the close button.

## Closing file details

- `Escape` closes the file details panel (and the "How it works" note).
- The close button and the panel backdrop close it too.
- Closing the panel returns focus to the element that opened it, so you
keep your place in the graph or the file list.
- There is no keyboard trap: `Tab` from the panel moves focus on.

## Mobile

- The page viewport does not disable pinch zoom, and the layout does
not overflow horizontally at a 390px width.
- The same keyboard flow works at a small width: open file details from
the Modules list and close them with `Escape`.

## Checking it

Run the browser check against a running dev server:

```sh
npm run dev            # in one terminal
npm run test:browser   # in another terminal
```

It drives the flow above in Chromium and fails if focus does not move
into the panel, if `Escape` does not close it, if focus does not return
to the file button, if focus is not visible, or if the mobile viewport
disables zoom or overflows. The check also runs in CI.
