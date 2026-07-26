//Brand logo
import logo01 from "../assets/images/logo/logo01.png";
import logo02 from "../assets/images/logo/logo02.png";
import NoUserProfile from "../assets/images/NoUserProfile.jpg";
import NotFoundPage from "../assets/images/NotFoundPage.svg";
import NoAccess from "../assets/images/NoAccess.svg";
import NoInternet from "../assets/images/NoInternet.svg";
import SessionExpired from "../assets/images/SessionExpired.svg";

// GIF
import upgradeStars from "../assets/images/upgradeStars.gif";

function ALLImages(img) {
  const i = {
    hBlackLogo: logo01,
    hWhiteLogo: logo01,
    sBlackLogo: logo02,
    sWhiteLogo: logo02,
    sYellowLogo: logo02,
    upgradeStars,
    NotFoundPage,
    NoAccess,
    SessionExpired,
    NoInternet,
    sPurpleLogo: logo02,
    NoUserProfile,
  };
  return i[img];
}

export default ALLImages;
