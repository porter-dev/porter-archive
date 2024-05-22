import React, { SVGProps } from "react";
import styled from "styled-components";

function CommandLineIcon(props: SVGProps<SVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      x="0"
      y="0"
      version="1.1"
      viewBox="0 0 24 24"
      xmlSpace="preserve"
      className={props.className}
      onClick={props.onClick}
    >
      <linearGradient
        x1="825.344"
        x2="825.344"
        y1="-528.502"
        y2="-529.502"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0" stopColor="#656565"></stop>
        <stop offset="0.618" stopColor="#1b1b1b"></stop>
        <stop offset="0.629" stopColor="#545454"></stop>
        <stop offset="0.983" stopColor="#3e3e3e"></stop>
      </linearGradient>
      <path d="M3.2 17.3L2 15.9c-.2-.2-.2-.6.1-.7l5.4-4.5c.3-.2.3-.6 0-.8L2 5.4c-.2-.2-.2-.5 0-.8l1.2-1.5c.2-.1.5-.2.7 0l7.6 6.3c.5.4.5 1.3 0 1.7l-7.6 6.3c-.2.2-.5.2-.7-.1zM21.6 21H9.4c-.3 0-.6-.2-.6-.5v-1.9c0-.3.2-.5.6-.5h12.2c.3 0 .6.2.6.5v1.9c-.1.3-.3.5-.6.5z"></path>
    </svg>
  );
}

export default CommandLineIcon;

const SVG = styled.svg``;
