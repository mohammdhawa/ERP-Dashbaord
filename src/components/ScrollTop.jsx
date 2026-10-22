import { useEffect } from "react";

const ScrollTop = () => {
  const screenUp = () => {
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const handleScroll = () => {
      const color = document.getElementsByClassName("scrollToTop")[0];
      if (color) {
        window.scrollY > 100
          ? (color.style.display = "flex")
          : (color.style.display = "none");
      }
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // No second #responsive-overlay here. Sidebar.jsx already renders one with
  // that id and the click handler that closes the menu; this duplicate was
  // invalid markup and inert — Header's document.querySelector("#responsive-
  // overlay") always matched the sidebar's copy, which comes first in the DOM.
  return (
    <button
      type="button"
      className="scrollToTop"
      onClick={screenUp}
      aria-label="العودة إلى أعلى الصفحة"
    >
      <span className="arrow">
        <i className="ri-arrow-up-line fs-16" aria-hidden="true"></i>
      </span>
    </button>
  );
};

export default ScrollTop;
