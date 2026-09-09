document.addEventListener("DOMContentLoaded", function () {
    const source = document.querySelector(".md-header__source");
    if (!source) return;

    const link = document.createElement("a");
    link.href = "https://beamtime.seescience.org/";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.title = "Open BeamtimeApp";
    link.setAttribute("aria-label", "Open BeamtimeApp");
    link.className = "md-header__button md-icon";
    // Material Design "open-in-new" icon
    link.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
        '<path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z"/>' +
        "</svg>";

    source.parentNode.insertBefore(link, source);
});
