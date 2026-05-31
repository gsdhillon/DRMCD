import { useEffect, useState } from "react";
import { Button } from "./Button.jsx";
import { useRenderDebug } from "./useRenderDebug.js";

function sortIcon(sortField, sortDirection, field) {
  if (sortField !== field) {
    return "bi bi-arrow-down-up ms-1 text-secondary";
  }

  return sortDirection === "asc" ? "bi bi-sort-up ms-1" : "bi bi-sort-down ms-1";
}

function pageNumbers(totalPages) {
  return Array.from({ length: totalPages }, (_, index) => index + 1);
}

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

function activeFilterCount(columnFilters) {
  return Object.values(columnFilters).filter(value => String(value || "").trim()).length;
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function fileSafeName(value) {
  return String(value || "table")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "table";
}

function textFromReactNode(node) {
  if (node === undefined || node === null || typeof node === "boolean") {
    return "";
  }

  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(textFromReactNode).join("");
  }

  if (node.props?.children !== undefined) {
    return textFromReactNode(node.props.children);
  }

  return "";
}

function cellText(column, row) {
  const value = column.value ? column.value(row) : row[column.field];
  const rendered = column.render ? column.render(value, row) : value;
  const text = textFromReactNode(rendered);

  return text || (value === undefined || value === null ? "" : String(value));
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? "\"" + text.replace(/"/g, "\"\"") + "\"" : text;
}

function pdfEscape(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, " ");
}

function makePdf(title, columns, rows) {
  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 32;
  const lineHeight = 14;
  const fontSize = 9;
  const usableWidth = pageWidth - (margin * 2);
  const lines = [
    title,
    "",
    columns.map(column => column.label).join(" | "),
    "-".repeat(110),
    ...rows.map(row => columns.map(column => cellText(column, row)).join(" | "))
  ];
  const pages = [];

  for (let index = 0; index < lines.length; index += Math.floor((pageHeight - (margin * 2)) / lineHeight)) {
    pages.push(lines.slice(index, index + Math.floor((pageHeight - (margin * 2)) / lineHeight)));
  }

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [" + pages.map((_, index) => `${3 + (index * 2)} 0 R`).join(" ") + "] /Count " + pages.length + " >>"
  ];

  pages.forEach((pageLines, pageIndex) => {
    const pageObjectNumber = 3 + (pageIndex * 2);
    const contentObjectNumber = pageObjectNumber + 1;
    const content = [
      "BT",
      `/F1 ${fontSize} Tf`,
      `${margin} ${pageHeight - margin} Td`,
      ...pageLines.flatMap((line, lineIndex) => {
        const truncated = line.length > Math.floor(usableWidth / (fontSize * 0.55))
          ? line.slice(0, Math.floor(usableWidth / (fontSize * 0.55)) - 3) + "..."
          : line;

        return [
          lineIndex === 0 ? "" : `0 -${lineHeight} Td`,
          `(${pdfEscape(truncated)}) Tj`
        ].filter(Boolean);
      }),
      "ET"
    ].join("\n");

    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents ${contentObjectNumber} 0 R >>`);
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset => {
    pdf += String(offset).padStart(10, "0") + " 00000 n \n";
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

export function DataTable(props) {
  useRenderDebug("DataTable");

  const [activeColumnFilter, setActiveColumnFilter] = useState(null);
  const [columnFilterCursor, setColumnFilterCursor] = useState(null);
  const colSpan = props.columns.length + (props.renderActions ? 1 : 0);
  const columnFilters = props.columnFilters || {};
  const filterCount = activeFilterCount(columnFilters);
  const exportRows = props.exportRows || props.rows;
  const exportFileName = fileSafeName(props.title);

  useEffect(() => {
    if (!activeColumnFilter || columnFilterCursor === null) {
      return;
    }

    const input = document.getElementById(columnFilterInputId(activeColumnFilter));

    if (input && typeof input.setSelectionRange === "function") {
      input.focus();
      input.setSelectionRange(columnFilterCursor, columnFilterCursor);
    }
  }, [activeColumnFilter, columnFilterCursor, columnFilters]);

  useEffect(() => {
    function closeMobileActions(pointerEvent) {
      document.querySelectorAll(".table-actions-mobile[open]").forEach(menu => {
        if (!menu.contains(pointerEvent.target)) {
          menu.removeAttribute("open");
        }
      });
    }

    const eventName = window.PointerEvent ? "pointerdown" : "touchstart";

    document.addEventListener(eventName, closeMobileActions, true);
    return () => document.removeEventListener(eventName, closeMobileActions, true);
  }, []);

  useEffect(() => {
    if (!activeColumnFilter) {
      return undefined;
    }

    function closeColumnFilter(pointerEvent) {
      if (!pointerEvent.target.closest(".table-column-filter-wrap")) {
        setActiveColumnFilter(null);
      }
    }

    const eventName = window.PointerEvent ? "pointerdown" : "touchstart";

    document.addEventListener(eventName, closeColumnFilter, true);
    return () => document.removeEventListener(eventName, closeColumnFilter, true);
  }, [activeColumnFilter]);

  function pageButton(page, label, disabled, active) {
    return (
      <li key={label} className={"page-item" + (disabled ? " disabled" : "") + (active ? " active" : "")}>
        <Button look="page-link" disabled={disabled} label={label} onClick={() => !disabled && props.onPage(page)} />
      </li>
    );
  }

  function columnFilterInputId(field) {
    return (props.searchInputId || "data-table") + "-column-filter-" + field;
  }

  function updateColumnFilter(field, value) {
    setColumnFilterCursor(value.length);
    props.onColumnFilter?.(field, value);
  }

  function clearAllFilters() {
    setActiveColumnFilter(null);
    setColumnFilterCursor(null);
    props.onClearColumnFilters?.();
  }

  function exportCsv() {
    const csv = [
      props.columns.map(column => csvEscape(column.label)).join(","),
      ...exportRows.map(row => props.columns.map(column => csvEscape(cellText(column, row))).join(","))
    ].join("\r\n");

    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), exportFileName + ".csv");
  }

  function exportPdf() {
    downloadBlob(makePdf(props.title, props.columns, exportRows), exportFileName + ".pdf");
  }

  function renderTableTools() {
    if (!props.onColumnFilter) {
      return null;
    }

    return (
      <div className="table-tools" role="group" aria-label={props.title + " tools"}>
        <Button
          look="table-clear-filters"
          active={filterCount > 0}
          icon="bi bi-eraser"
          title="Clear all filters"
          disabled={!filterCount}
          onClick={clearAllFilters}
        />
        <Button
          look="table-tool"
          icon="bi bi-filetype-csv"
          title="Export CSV"
          onClick={exportCsv}
        />
        <Button
          look="table-tool"
          icon="bi bi-filetype-pdf"
          title="Export PDF"
          onClick={exportPdf}
        />
      </div>
    );
  }

  function renderColumnFilter(column) {
    const value = columnFilters[column.field] || "";
    const active = Boolean(value.trim());
    const open = activeColumnFilter === column.field;

    return (
      <div className="table-column-filter-wrap">
        <Button
          look="table-column-filter"
          active={active}
          icon={active ? "bi bi-funnel-fill" : "bi bi-funnel"}
          title={"Filter " + column.label}
          aria-expanded={open}
          onClick={() => {
            setColumnFilterCursor(value.length);
            setActiveColumnFilter(current => current === column.field ? null : column.field);
          }}
        />
        {open ? (
          <div className="input-group input-group-sm table-column-filter">
            <span className="input-group-text"><i className="bi bi-search" aria-hidden="true" /></span>
            <input
              id={columnFilterInputId(column.field)}
              className="form-control"
              placeholder={"Search " + column.label}
              type="text"
              value={value}
              onChange={event => {
                setColumnFilterCursor(event.target.selectionStart);
                props.onColumnFilter?.(column.field, event.target.value);
              }}
            />
            {value ? (
              <Button
                look="table-search-clear"
                icon="bi bi-x-lg"
                title="Clear filter"
                onClick={() => updateColumnFilter(column.field, "")}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  function renderRow(item) {
    return (
      <tr key={item.id}>
        {props.columns.map(column => {
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
              : props.searchFields?.includes(column.field)
                ? highlightText(value, props.searchTerm)
                : value === undefined || value === null ? "" : value;

          return <td key={column.field} className={className}>{content}</td>;
        })}
        {props.renderActions ? (
          <td className="text-end text-nowrap">
            <div className="table-actions-desktop">{props.renderActions(item)}</div>
            <details className="table-actions-mobile">
              <summary title="Actions"><i className="bi bi-three-dots-vertical" aria-hidden="true" /></summary>
              <div className="table-actions-popup">{props.renderActions(item)}</div>
            </details>
          </td>
        ) : null}
      </tr>
    );
  }

  return (
    <div className="card data-table-card shadow-sm border-0">
      <div className="card-header border-0">
        <div className="table-toolbar">
          <div className="d-flex align-items-center gap-2">
            <h2 className="table-title">
              {props.icon ? <i className={props.icon + " me-2"} aria-hidden="true" /> : null}
              {props.title}
            </h2>
            <span className="text-secondary text-nowrap">{String(props.filteredCount)} of {String(props.totalCount)}</span>
          </div>
          {props.onPage ? (
            <nav className="pagination-wrap" aria-label={props.title + " pages"}>
              <ul className="pagination pagination-sm mb-0">
                {pageButton(props.currentPage - 1, "Prev", props.currentPage === 1, false)}
                {pageNumbers(props.totalPages).map(page => pageButton(page, String(page), false, page === props.currentPage))}
                {pageButton(props.currentPage + 1, "Next", props.currentPage === props.totalPages, false)}
              </ul>
            </nav>
          ) : null}
          {renderTableTools()}
          {props.toolbarActions || props.onAdd ? (
            <div className="table-command-group" role="group" aria-label={props.title + " commands"}>
              {props.toolbarActions}
              {props.onAdd ? (
                <Button look="table-add" title={props.addLabel} onClick={props.onAdd}>
                  <i className="bi bi-plus-lg" aria-hidden="true" />
                  <i className={props.addIcon || props.icon} aria-hidden="true" />
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <div className="card-body pt-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
            <tr>
              {props.columns.map(column => (
                <th
                  key={column.field}
                  scope="col"
                  className={activeColumnFilter === column.field ? "table-filter-open" : undefined}
                >
                  <div className="table-column-header">
                    <div className="table-column-title-row">
                      {column.sortable === false || !props.onSort ? (
                        <span className="fw-semibold">{column.label}</span>
                      ) : (
                        <Button look="column-sort" onClick={() => props.onSort(column.field)}>
                          {column.label}
                          <i className={sortIcon(props.sortField, props.sortDirection, column.field)} aria-hidden="true" />
                        </Button>
                      )}
                      {props.onColumnFilter ? renderColumnFilter(column) : null}
                    </div>
                  </div>
                </th>
              ))}
              {props.renderActions ? <th scope="col" className="text-end">{props.actionLabel || "Action"}</th> : null}
            </tr>
            </thead>
            <tbody>
            {props.rows.length === 0 ? (
              <tr><td colSpan={colSpan} className="text-secondary py-4 text-center">{props.emptyText}</td></tr>
            ) : props.rows.map(renderRow)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
