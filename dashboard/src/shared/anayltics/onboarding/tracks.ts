import { NEW_PROJECT_EVENT } from "./events";

export function trackCreateNewProject() {
  window.analytics?.track(NEW_PROJECT_EVENT);
}
