const ERROR_CODE_UPDATE_FAILED = 90;
export const ERROR_CODE_APPLICATION_ROLLBACK = 91;
export const ERROR_CODE_APPLICATION_ROLLBACK_FAILED = 92;

export const ERROR_CODE_TO_SUMMARY: Record<number, string> = {
  [ERROR_CODE_UPDATE_FAILED]: "The latest version failed to deploy",
  [ERROR_CODE_APPLICATION_ROLLBACK]:
    "A version deployment failure triggered an auto-rollback",
  [ERROR_CODE_APPLICATION_ROLLBACK_FAILED]:
    "Porter attempted a rollback, but the new deployment failed",
};
