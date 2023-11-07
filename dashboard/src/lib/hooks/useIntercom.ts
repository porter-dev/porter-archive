// useIntercom contains all the utility methods related to the Intercom chat widget
export const useIntercom = (): {
  showIntercomWithMessage: ({
    message,
    delaySeconds,
  }: {
    message: string;
    delaySeconds?: number | undefined;
  }) => void;
} => {
  const showIntercomWithMessageAfterDelay = (
    message: string,
    delaySeconds: number
  ): void => {
    const func = (): void => {
      if (typeof window.Intercom === "function") {
        window.Intercom("showNewMessage", message);
      }
    };
    setTimeout(func, delaySeconds * 1000);
  };

  const showIntercomWithMessage = ({
    message,
    delaySeconds = 3,
  }: {
    message: string;
    delaySeconds?: number;
  }): void => {
    showIntercomWithMessageAfterDelay(message, delaySeconds);
  };

  return {
    showIntercomWithMessage,
  };
};
