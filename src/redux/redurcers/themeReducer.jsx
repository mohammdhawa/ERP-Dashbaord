
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
  toggled: "",
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
