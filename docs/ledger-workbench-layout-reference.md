# Ledger Workbench layout reference

## Purpose

Table-first operational workspace. User validates source records while seeing the derived performance result in the same context.

Use this pattern when:

- One record collection is the source of truth.
- A visual or calculated view helps explain the records.
- Selecting either representation must preserve shared context.

Do not use it for a metric-only dashboard, an exploratory canvas, or a task needing uninterrupted focus.

## Layout thesis

The ledger is the audit surface. The chart is a coordinated explanatory surface. Summary metrics provide scan-first orientation, but do not replace the source records.

```text
sticky product header

page title + purpose                               import | primary add | reset
period controls
four summary metrics

transaction ledger (canonical records)             range performance (derived view)
table                                               chart + legend + explanation

method / provenance note
```

This is a table + coordinated-detail split layout, not a generic dashboard. The ordering answers the work sequence:

1. Identify workspace and objective.
2. Set the calculation range.
3. Scan headline results.
4. Validate a record against its visual consequence.

## Desktop blueprint

| Region | Structure | Layout rule |
| --- | --- | --- |
| Product header | Brand at start; three concept links at end | Sticky, `76px` minimum height. Content aligns to the page safe zone. |
| Page introduction | Eyebrow, H1, one-sentence purpose; actions opposite | Two columns. Actions stay together; only **Add valued entry** is filled/primary. |
| Range controls | Start, end, presets, helper text | One bordered region. Field labels sit directly above controls. Helper text spans the region below. |
| Metric strip | XIRR, TWR, net external flow, closing value | Four equal cards. Metrics scan before detailed inspection. |
| Workbench | Ledger plus chart | Two columns: `1.35fr minmax(420px, 1fr)`, `14px` gap. Ledger gets more width. |
| Panel heading | Kicker + title at start; short instruction at end | Shared heading skeleton and a bottom divider distinguish panel context from content. |
| Ledger | Five-column table inside one-axis horizontal scroller | Source view remains first and widest. Rows grow the page; no internal vertical scrolling. |
| Performance | SVG chart, legend, caption | Derived view stays adjacent to ledger so selection can be traced both ways. |
| Method note | Muted text below workspace | Keeps assumptions available without competing with the operational task. |

### Geometry

- Primary content safe zone: `1520px` maximum content width.
- Main shell: maximum `1568px` including `24px` side padding.
- Desktop page padding: `36px 24px 72px`.
- Desktop page-intro gap: `32px`; panel/metric/workbench gaps: `10–14px`.
- Panels: white surface, `1px` border, `10px` radius.
- Controls and row actions: at least `44px` high.
- Ledger table: `760px` minimum width. Horizontal overflow belongs only to the table wrapper.

Do not stretch the workbench across an ultra-wide viewport. Keep the source and derived views within the shared safe zone.

## Responsive contract

| Width | Structure | Required behavior |
| --- | --- | --- |
| `>1120px` | Two-pane workbench | Ledger and performance chart remain side by side. Header remains sticky. |
| `761–1120px` | Stacked workbench | Intro actions wrap below the copy. Ledger and chart become full-width, sequential panels. |
| `431–760px` | Single task panel | Header becomes in-flow. Metrics become two columns. A two-option switch exposes either Performance or Ledger; never render both tall panels at once. |
| `≤430px` | Narrow single column | Range fields stack; import and actions stack; primary and reset actions fill available width. |

Mobile defaults to **Performance**, then lets the user switch to **Ledger**. Keep both options in the same workbench region; do not move either view into global navigation.

The source table keeps its `760px` minimum width behind horizontal scrolling. The page itself must not gain horizontal scrolling.

## Grouping and hierarchy rules

- Use one common region for period controls, one card per metric, and one region per coordinated view.
- Use whitespace and shared alignment first. Borders define true context boundaries: header/content, control surface, metric cards, and source/derived panels.
- Put the calculation controls before results. Put results before raw and visual detail.
- Reserve filled primary styling for the creation action. Import and reset stay secondary.
- Keep concise panel instructions in the heading: “Select a row to trace it” and “Linked to ledger selection” describe the connection at point of use.
- Give selected records one shared state across views: ledger row fill plus inset accent; chart marker fill/stroke change. Hover mirrors the same relationship.
- Keep labels domain-specific and action-specific: “From valuation”, “To valuation”, “Transaction ledger”, “Range performance”.

## Coordinated-view contract

The pattern depends on one selected record ID shared by both panes.

| User action | Required result |
| --- | --- |
| Select ledger row | Highlight matching chart marker; retain range and selected record. |
| Select chart marker | Highlight matching ledger row; scroll only the table row into view when needed. |
| Hover either representation | Temporarily highlight its counterpart. |
| Change period | Recalculate metrics/chart and clear stale selection. |
| Switch mobile panel | Preserve selection; reveal the selected counterpart when that panel opens. |

Use this contract for other paired views: orders + map, incidents + timeline, inventory + floor plan, or records + allocation chart.

## Reuse checklist

- [ ] A canonical record view exists and gets the larger desktop pane.
- [ ] A derived view answers a different question, rather than duplicating table columns.
- [ ] One range/filter region drives metrics and both coordinated views.
- [ ] The page has one primary creation action.
- [ ] Source and derived view share selection, hover, and empty-state behavior.
- [ ] Tablet stacks panels before mobile hides one behind a local switch.
- [ ] Only a wide table may scroll horizontally; no nested vertical scrolling.
- [ ] Content width is capped; controls remain at least `44px` high.

## Deliberate exclusions

- No persistent side navigation. This workspace has shallow concept navigation and needs maximum data width.
- No sticky table header or sticky second pane. The header alone persists; extra fixed layers would reduce usable chart and table space.
- No mobile bottom action bar. Creation remains in the page intro because the action is important but not continuous while reviewing results.
- No card conversion for rows. Field comparison and auditability matter more than mobile card aesthetics; horizontal table scroll preserves aligned columns.

## Source extraction

- View skeleton and shared-selection behavior: `src/app.js` (`workbenchView`, `ledgerTable`, `performanceChart`, `selectRecord`).
- Layout geometry, breakpoints, and mobile panel switch: `styles.css` (`.workbench-grid`, `.table-wrap`, and the `1120px`, `760px`, `430px` media queries).
- Global header structure: `index.html`.

Dembrandt scope: Stage 3 — layout and structure. Brand, token, component-state, UX-polish, and accessibility stages were intentionally not extracted here.
