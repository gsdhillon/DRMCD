export function photoSrc(photo) {
  if (!photo) {
    return "";
  }

  if (/^(data:|https?:)/i.test(photo)) {
    return photo;
  }

  return "data:image/*;base64," + photo;
}

export function readPhoto(inputEvent, onRead) {
  const file = inputEvent.target.files?.[0];

  if (!file) {
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    const result = String(reader.result || "");
    const base64 = result.includes(",") ? result.split(",")[1] : result;

    onRead(base64);
  };

  reader.readAsDataURL(file);
}

export function valueOrEmpty(value) {
  return value === undefined || value === null ? "" : value;
}
