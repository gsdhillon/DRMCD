import { Photo } from "../../common/Photo.jsx";
import { useRenderDebug } from "../../common/useRenderDebug.js";
import { useApp } from "../../app/AppContext.jsx";

export function Dashboard() {
  useRenderDebug("Dashboard");

  const { user } = useApp();

  return (
    <section className="content-panel dashboard-panel">
      <div className="person-layout dashboard-layout">
        <div className="person-details">
          <dl className="summary-list">
            <div>
              <dt>Person Id</dt>
              <dd>{user?.personId || user?.id || "-"}</dd>
            </div>
            <div>
              <dt>Name</dt>
              <dd>{user?.name || "-"}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{user?.email || "-"}</dd>
            </div>
            <div>
              <dt>Mobile No</dt>
              <dd>{user?.mobileNo || "-"}</dd>
            </div>
            <div>
              <dt>Designation</dt>
              <dd>{user?.designation || "-"}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{user?.role || "-"}</dd>
            </div>
          </dl>
        </div>
        <div className="person-photo-column">
          <Photo editable={false} photo={user?.photo || user?.thumbnail} />
        </div>
      </div>
    </section>
  );
}
