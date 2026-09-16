// EVERY IMPORT HERE IS EAGER, AND THIS MODULE IS IN THE ENTRY CHUNK.
//
// Header, Sidebar, Loader and Signin all call ALLImages, so whatever this file
// imports is fetched by the build for every page — including the sign-in
// screen — whether or not any live route renders it. Two entries were costing
// that for nothing and have been removed:
//
//   upgradeStars.gif   917 KB, referenced only by sections/rolesPermissions/
//                      Permissions.jsx, which is not routed and not reachable
//                      from the entry graph.
//   NoUserProfile.jpg   40 KB, referenced only by the unrouted
//                      sections/users/DetailUserModal.jsx and
//                      sections/advertisements/ads/AdDetails.jsx.
//
// Those three files now import the asset directly, so they keep working if
// they are ever revived, and the bytes travel with THEM rather than with the
// first paint. Add nothing here that the live shell does not render.
//
// ⚠️ STILL OUTSTANDING: logo02.png is 271 KB and logo01.png 100 KB, for marks
// drawn at 36px and 184px. Re-exporting them at the sizes actually used (or as
// SVG — assets/images/logo/Solo_Purple.svg is 1.7 KB) is the single largest
// remaining win on this page, but it is a brand-asset change, not a code one.
import logo01 from "../assets/images/logo/logo01.png";
import logo02 from "../assets/images/logo/logo02.png";
import NotFoundPage from "../assets/images/NotFoundPage.svg";
import NoAccess from "../assets/images/NoAccess.svg";
import NoInternet from "../assets/images/NoInternet.svg";
import SessionExpired from "../assets/images/SessionExpired.svg";

function ALLImages(img) {
  const i = {
    hBlackLogo: logo01,
    hWhiteLogo: logo01,
    sBlackLogo: logo02,
    sWhiteLogo: logo02,
    sYellowLogo: logo02,
    NotFoundPage,
    NoAccess,
    SessionExpired,
    NoInternet,
    sPurpleLogo: logo02,
  };
  return i[img];
}

export default ALLImages;
