import React from "react";

import { type IconProps } from "./types";

const MoonBaseIcon: React.FC<IconProps> = ({ className, styles, fill }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={styles}
      fill={fill}
    >
      <path
        d="M21.5999 14.6398C20.6977 14.9134 19.7404 15.0606 18.7487 15.0606C13.3307 15.0606 8.93856 10.6684 8.93856 5.25042C8.93856 4.2592 9.08557 3.30232 9.35897 2.40039C5.33153 3.62177 2.40002 7.36343 2.40002 11.7898C2.40002 17.2078 6.79218 21.5999 12.2102 21.5999C16.637 21.5999 20.3789 18.6679 21.5999 14.6398Z"
        stroke="black"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default MoonBaseIcon;
