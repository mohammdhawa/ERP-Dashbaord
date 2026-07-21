//Brand logo
import hBlackLogo from "../../src/assets/images/logo/Horizontal_Black.png";
import hWhiteLogo from "../../src/assets/images/logo/Horizontal_White.png";
import sBlackLogo from "../../src/assets/images/logo/Solo_Black.png";
import sWhiteLogo from "../../src/assets/images/logo/Solo_White.png";
import sYellowLogo from "../../src/assets/images/logo/Solo_Yellow.png";
import sPurpleLogo from "../../src/assets/images/logo/Solo_Purple.svg";
import NoUserProfile from "../assets/images/NoUserProfile.jpg";
import NotFoundPage from "../assets/images/NotFoundPage.svg";
import NoAccess from "../assets/images/NoAccess.svg";
import NoInternet from "../assets/images/NoInternet.svg";
import SessionExpired from "../assets/images/SessionExpired.svg";

// GIF
import upgradeStars from "../assets/images/upgradeStars.gif";

function ALLImages(img) {
  const i = {
    hBlackLogo,
    hWhiteLogo,
    sBlackLogo,
    sWhiteLogo,
    sYellowLogo,
    upgradeStars,
    NotFoundPage,
    NoAccess,
    SessionExpired,
    NoInternet,
    sPurpleLogo,
    NoUserProfile,
  };
  return i[img];
}

export default ALLImages;
