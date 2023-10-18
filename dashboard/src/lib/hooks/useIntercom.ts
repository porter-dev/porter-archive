export const useIntercom = () => {
    const showIntercomMessenger = () => {
        if (typeof window.Intercom === 'function') {
            // You can use the 'show' method to open the messenger
            window.Intercom('showNewMessage', 'I am having issues updating my application.');
        }
    }

    return {
        showIntercomMessenger,
    }
}