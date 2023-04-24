import React from "react";
import type { Meta, StoryObj } from '@storybook/react';

import Button from './Button';

const meta: Meta<typeof Button> = {
  title: 'Button',
  component: Button,
};

export default meta;

type Story = StoryObj<typeof Button>;

export const Default: Story = {
  render: () => <Button onClick={() => {console.log('clicked')}}>Button</Button>,
};


export const Success: Story = {
  render: () => <Button status="success" onClick={() => {console.log('clicked')}}>Button</Button>,
};

export const Loading: Story = {
  render: () => <Button status="loading" onClick={() => {console.log('clicked')}}>Button</Button>,
};

export const Disabled: Story = {
  render: () => <Button disabled onClick={() => {console.log('clicked')}}>Button</Button>,
};

