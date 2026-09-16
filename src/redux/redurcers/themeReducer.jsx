// Below 992px the sidebar is a fixed 16rem overlay that is ONLY moved
// off-canvas by the `[data-toggled="close"]` rule. Seeding `toggled` as ""
// therefore left it sitting on top of the page on first load — covering the
// content, with no backdrop and nothing telling the user to dismiss it. The
// breakpoint matches the one Sidebar's resize handler and Header's toggle use.
const initialToggled =
  typeof window !== "undefined" && window.innerWidth < 992 ? "close" : "";

const initialState = {
  lang: "ar",
  dir: localStorage.getItem("dir") || "rtl",
  datanavlayout: "vertical",
  datathememode: localStorage.getItem("datathememode") || "light",
  dataheaderstyles: localStorage.getItem("datathememode") || "light",
  datamenustyles: localStorage.getItem("datathememode") || "light",
  dataverticalstyle: "overlay",
  stylebodybg: "",
  styledarkbg: "",
  toggled: initialToggled,
  datanavstyle: "",
  horstyle: "",
  datapagestyle: "regular",
  datawidth: "fullwidth",
  datamenuposition: "fixed",
  dataheaderposition: "fixed",
  iconoverlay: "",
  colorprimaryrgb: "",
  bodybg: "",
  light: "",
  darkbg: "",
  inputborder: "",
  bgimg: "",
  icontext: "",
  body: {
    class: "",
  },
};

const themeReducer = (state = initialState, action) => {
  switch (action.type) {
    case "ThemeChanger":
      return { ...state, ...action.payload }; 
    default:
      return state;
  }
};

export default themeReducer;
