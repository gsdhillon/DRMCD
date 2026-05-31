import { PersonTable } from "./PersonTable.jsx";

function personTable(panel, onView) {
  return (
    <div className={panel.className}>
      <PersonTable
        actions={panel.actions || []}
        columnFields={["id", "name"]}
        emptyText={panel.emptyText}
        icon="people"
        onView={onView}
        pageSize={0}
        rows={panel.rows}
        searchFields={["id", "name"]}
        searchInputId={panel.searchInputId}
        searchPlaceholder={panel.searchPlaceholder}
        title={panel.title}
      />
    </div>
  );
}

export function PersonListSelector({ available, className, onView, selected, singleClassName }) {
  return (
    <section className={className + (!available && singleClassName ? " " + singleClassName : "")}>
      {personTable(selected, onView)}
      {available ? personTable(available, onView) : null}
    </section>
  );
}
