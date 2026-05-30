import { photoSrc, readPhoto } from "../app/Helpers.js";
import { useRenderDebug } from "../app/useRenderDebug.js";

export function Photo({ editable = false, onChange, photo }) {
  useRenderDebug("Photo");

  return (
    <div className="photo-field">
      <div className="photo-preview">
        {photo
          ? <img src={photoSrc(photo)} alt="Person" />
          : <span>No photo</span>}
      </div>
      {editable ? (
        <label className="photo-browse btn btn-outline-primary">
          <input type="file" accept="image/*" onChange={event => readPhoto(event, onChange || (() => {}))} />
          <i className="bi bi-image me-2" aria-hidden="true" />
          <span>Browse</span>
        </label>
      ) : null}
    </div>
  );
}
