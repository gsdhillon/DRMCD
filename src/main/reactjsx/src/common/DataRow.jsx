import { useRenderDebug } from "../app/useRenderDebug.js";

function highlightText(value, searchTerm) {
  const text = value === undefined || value === null ? "" : String(value);
  const term = (searchTerm || "").trim();

  if (!term) {
    return text;
  }

  const matchIndex = text.toLowerCase().indexOf(term.toLowerCase());

  if (matchIndex === -1) {
    return text;
  }

  return (
    <>
      {text.slice(0, matchIndex)}
      <mark className="search-highlight">{text.slice(matchIndex, matchIndex + term.length)}</mark>
      {text.slice(matchIndex + term.length)}
    </>
  );
}

export function DataRow({ columnFilters = {}, columns, item, renderActions, searchFields = [], searchTerm }) {
  useRenderDebug("DataRow");

  return (
    <tr>
      {columns.map(column => {
        const value = column.value ? column.value(item) : item[column.field];
        const className = typeof column.className === "function" ? column.className(item) : column.className || "";
        const columnSearchTerm = columnFilters[column.field] || "";
        const rendered = column.render ? column.render(value, item) : null;
        const content = column.render
          ? columnSearchTerm && (typeof rendered === "string" || typeof rendered === "number")
            ? highlightText(rendered, columnSearchTerm)
            : rendered
          : columnSearchTerm
            ? highlightText(value, columnSearchTerm)
            : searchFields.includes(column.field)
              ? highlightText(value, searchTerm)
              : value === undefined || value === null ? "" : value;

        return <td key={column.field} className={className}>{content}</td>;
      })}
      {renderActions ? (
        <td className="text-end text-nowrap">
          <div className="table-actions-desktop">{renderActions(item)}</div>
          <details className="table-actions-mobile">
            <summary title="Actions"><i className="bi bi-three-dots-vertical" aria-hidden="true" /></summary>
            <div className="table-actions-popup">{renderActions(item)}</div>
          </details>
        </td>
      ) : null}
    </tr>
  );
}
