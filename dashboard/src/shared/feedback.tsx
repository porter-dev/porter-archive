import axios from "axios";

export const handleSubmitFeedback = (
  msg: string,
  callback?: (err: any, res: any) => void
) => {
  axios
    .post(
      process.env.FEEDBACK_ENDPOINT,
      {
        key: process.env.DISCORD_KEY,
        cid: process.env.DISCORD_CID,
        message: msg
      },
      {
        headers: {
          Authorization: `Bearer <>`
        }
      }
    )
    .then(res => {
      callback && callback(null, res);
    })
    .catch(err => {
      callback && callback(err, null);
    });
};
