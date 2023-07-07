window.onload = () => {
    const buttons = document.querySelectorAll(".mdc-button");
    for (const button of buttons) {
      mdc.ripple.MDCRipple.attachTo(button);
    }
    
    const textFields = document.querySelectorAll(".mdc-text-field");
    for (const textField of textFields) {
      mdc.textField.MDCTextField.attachTo(textField);
    }

}