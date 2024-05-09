import { useEffect, useState } from "react";

/**
 *  Hook to open an authentication window at a given url.
 *  Once the auth flow redirects back to Porter, the window is closed.
 */
export const useAuthWindow = ({
  authUrl,
}: {
  authUrl: string;
}): {
  openAuthWindow: () => void;
} => {
  const [authWindow, setAuthWindow] = useState<Window | null>(null);

  const openAuthWindow = (): void => {
    const windowObjectReference = window.open(
      authUrl,
      "porterAuthWindow",
      "width=600,height=700,left=200,top=200"
    );
    setAuthWindow(windowObjectReference);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (authWindow) {
        try {
          if (
            authWindow.location.hostname.includes("dashboard.getporter.dev") ||
            authWindow.location.hostname.includes("cloud.porter.run") ||
            authWindow.location.hostname.includes("localhost")
          ) {
            authWindow.close();
            setAuthWindow(null);
            clearInterval(interval);
          }
        } catch (e) {
          console.log("Error accessing the authentication window.", e);
        }
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      if (authWindow) {
        authWindow.close();
      }
    };
  }, [authWindow]);

  return { openAuthWindow };
};
