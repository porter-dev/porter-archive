export const useIntercom = () => {
    const showIntercomWithMessage = (message: string) => {
        if (typeof window.Intercom === 'function') {
            window.Intercom('showNewMessage', message);
        }
    }

    return {
        showIntercomWithMessage,
    }
}