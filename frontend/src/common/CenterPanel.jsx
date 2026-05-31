import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "./Button.jsx";

const CenterPanelContext = createContext(null);

export function useCenterPanel() {
  return useContext(CenterPanelContext);
}

export function useCenterPanelActions(actions) {
  const centerPanel = useCenterPanel();

  useEffect(() => {
    if (actions === undefined) {
      return undefined;
    }

    centerPanel?.setActions(actions);
    return () => centerPanel?.setActions(null);
  }, [actions, centerPanel]);
}

export function CenterPanel({ children, title }) {
  const panelRef = useRef(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [actions, setActions] = useState(null);
  const [stack, setStack] = useState(() => [{ title, content: children }]);

  useEffect(() => {
    setStack([{ title, content: children }]);
  }, [title]);

  useEffect(() => {
    function updateFullscreen() {
      setFullscreen(document.fullscreenElement === panelRef.current);
    }

    document.addEventListener("fullscreenchange", updateFullscreen);
    return () => document.removeEventListener("fullscreenchange", updateFullscreen);
  }, []);

  const toggleFullscreen = useCallback(async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await panelRef.current?.requestFullscreen();
  }, []);

  const pushPage = useCallback(function pushPage(page) {
    setStack(current => current.concat(page));
  }, []);

  const goBack = useCallback(function goBack() {
    setStack(current => current.length > 1 ? current.slice(0, -1) : current);
  }, []);

  const popTo = useCallback(function popTo(index) {
    setStack(current => current.slice(0, index + 1));
  }, []);

  const value = useMemo(() => ({ goBack, pushPage, setActions }), [goBack, pushPage]);
  const activePage = stack[stack.length - 1];

  return (
    <CenterPanelContext.Provider value={value}>
      <div ref={panelRef} className="center-panel">
        <div className="center-panel-topbar">
          <div className="center-panel-path" aria-label="Current location">
            {stack.map((page, index) => {
              const isLast = index === stack.length - 1;

              return (
                <span key={index} className="center-panel-path-part">
                  {index > 0 ? <span className="center-panel-path-separator">/</span> : null}
                  {isLast ? (
                    <span>{page.title}</span>
                  ) : (
                    <button type="button" className="center-panel-path-button" onClick={() => popTo(index)}>
                      {page.title}
                    </button>
                  )}
                </span>
              );
            })}
          </div>

          <div className="center-panel-actions">
            {actions}
            {stack.length > 1 ? (
              <Button
                color="secondary-line"
                icon="arrow-left"
                label="Back"
                size="sm"
                title="Back"
                onClick={goBack}
              />
            ) : null}
            <Button
              color="danger-line"
              icon={fullscreen ? "fullscreen-exit" : "fullscreen"}
              size="sm"
              title={fullscreen ? "Exit full screen" : "Full screen"}
              onClick={toggleFullscreen}
            />
          </div>
        </div>

        <div className="center-panel-content">
          {activePage?.content}
        </div>
      </div>
    </CenterPanelContext.Provider>
  );
}
