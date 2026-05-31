import { cloneElement, isValidElement, useState } from "react";

export function FormDialog({ busy = false, children, onClose }) {
  const [closingAnimation, setClosingAnimation] = useState("");
  const animationClass = closingAnimation ? " modal-closing-" + closingAnimation : "";

  function closeWithAnimation(animation) {
    if (busy || closingAnimation) {
      return;
    }
    setClosingAnimation(animation);
    window.setTimeout(() => {
      setClosingAnimation("");
      onClose?.();
    }, animation === "submit" ? 440 : 360);
  }

  const child = isValidElement(children)
    ? cloneElement(children, {
      animationClass,
      dialog: true,
      onClose: () => closeWithAnimation("throw"),
      onSubmitSuccess: () => closeWithAnimation("submit")
    })
    : children;

  return (
    <div className={"modal-backdrop-custom" + animationClass} onClick={() => closeWithAnimation("throw")}>
      {child}
    </div>
  );
}
