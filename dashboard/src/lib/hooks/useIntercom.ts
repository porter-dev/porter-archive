export const useIntercom = () => {
    const showIntercomWithMessageAfterDelay = (message: string, delaySeconds: number) => {
        const func = () => {
            if (typeof window.Intercom === 'function') {
                window.Intercom('showNewMessage', message);
            }
        }
        setTimeout(func, delaySeconds * 1000);
    }

    const showIntercomWithMessage = ({ message, delaySeconds = 3 }: { message: string, delaySeconds?: number }) => {
        showIntercomWithMessageAfterDelay(message, delaySeconds);
    }

    return {
        showIntercomWithMessage,
    }
}