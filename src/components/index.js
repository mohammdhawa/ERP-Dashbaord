import { default as Header } from "./Header";
import { default as Sidebar } from "./Sidebar";
import { default as PageHeader } from "./Pageheader";
import { default as ScrollTop } from "./ScrollTop";
import { default as TablePagination } from "./TablePagination";
import { default as Loader } from "./Loader";

import { default as DataTable } from "./DataTable";
import { default as NoInternetConnection } from "./NoInternetConnection";
import { default as ModalFallback } from "./ModalFallback";

// The five ApexCharts-backed statistics widgets are deliberately NOT re-exported
// here. App.jsx imports this barrel for Header/Sidebar/ScrollTop, so every
// symbol it names lands in the main chunk — and because `apexcharts` is not
// side-effect-free, Rollup cannot drop it. That put the whole charting library
// (~750 references in the built bundle) on every page including the sign-in
// screen, for widgets no live route renders.
//
// Their only consumer is sections/packages/Packages.jsx, which is not routed.
// If charts come back, import them directly from "../components/statistics/…"
// at the point of use — ideally behind React.lazy — never through this barrel.
export {
  Header,
  Sidebar,
  PageHeader,
  ScrollTop,
  TablePagination,
  Loader,
  DataTable,
  NoInternetConnection,
  ModalFallback,
};
