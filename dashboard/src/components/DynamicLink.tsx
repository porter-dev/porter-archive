import React from "react";
import { Link, LinkProps } from "react-router-dom";

const DynamicLink: React.FC<LinkProps> = ({ to, children, hasunderline, ...props }) => {
  // It is a simple element with nothing to link to
  if (!to) return <span {...props}>{children}</span>;

  // It is intended to be an external link
  if (typeof to === "string" && /^https?:\/\//.test(to))
    return (
      <a href={to} {...props}>
        {children}
      </a>
    );

  // Finally, it is an internal link
  return (
    <Link to={to} {...props}>
      {children}
    </Link>
  );
};

export default DynamicLink;
