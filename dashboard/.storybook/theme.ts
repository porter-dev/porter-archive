import { create } from '@storybook/theming/create';

const bgColor = 'rgb(32, 34, 39)'

export default create({
    base: 'dark',
    brandTitle: 'Porter UI',
    brandUrl: 'https://porter.run',
    brandImage: 'https://blog.porter.run/assets/icons/porter-square.png',
    brandTarget: '_self',
    barBg: bgColor,
    appBg: bgColor
});
