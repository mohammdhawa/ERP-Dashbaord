import { Fragment, useEffect } from "react";

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

  return (
    <Fragment>
      <div className="scrollToTop" onClick={screenUp}>
        <span className="arrow">
          <i className="ri-arrow-up-line fs-16"></i>
        </span>
      </div>
      <div id="responsive-overlay"></div>
    </Fragment>
  );
};

export default ScrollTop;
