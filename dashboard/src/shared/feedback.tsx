import axios from "axios";

export const handleSubmitFeedback = (
  msg: string,
  callback?: (err: any, res: any) => void
) => {
  axios
    .get(
      process.env.FEEDBACK_ENDPOINT,
      {
        params: {
          message: msg,
        }
      },
    )
    .then((res) => {
      callback && callback(null, res);
    })
    .catch((err) => {
      callback && callback(err, null);
    });
};