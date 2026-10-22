import { default as Header } from "./Header";
import { default as Sidebar } from "./Sidebar";
import { default as PageHeader } from "./Pageheader";
import { default as ScrollTop } from "./ScrollTop";
import { default as Loader } from "./Loader";

import { default as NoInternetConnection } from "./NoInternetConnection";
import { default as ModalFallback } from "./ModalFallback";

// THIS BARREL IS THE APP SHELL. Nothing else belongs in it.
//
// App.jsx imports it for Header/Sidebar/ScrollTop/Loader, so every symbol it
// names lands in the ENTRY chunk — downloaded before the sign-in box renders,
// on every visit, whether or not any route uses it. Two families were doing
// exactly that:
//
// - The five ApexCharts-backed statistics widgets. `apexcharts` is not
//   side-effect-free, so Rollup cannot drop it: the whole charting library
//   shipped on every page for widgets no live route renders. Their only
//   consumer is the unrouted sections/packages/Packages.jsx.
// - DataTable and TablePagination, the CLIENT-paged pair from before the API
//   was paginated. They drag in react-select and react-loader-spinner, and
//   every live list uses DataTableServer/TablePaginationServer instead; the
//   six files still importing them are all unrouted.
//
// Both now import what they need directly at the point of use. If either comes
// back, do the same — ideally behind React.lazy — never through this barrel.
export {
  Header,
  Sidebar,
  PageHeader,
  ScrollTop,
  Loader,
  NoInternetConnection,
  ModalFallback,
};
