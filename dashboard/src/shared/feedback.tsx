import axios from 'axios';

const ignoreUsers = [
  'justin@getporter.dev',
  'trevor@getporter.dev',
  'belanger@getporter.dev',
  'seanr112593@gmail.com',
];

export const handleSubmitFeedback = (msg: string, callback?: (err: any, res: any) => void) => {
  let splits = msg.split(' ');
  if (!window.location.href.includes('localhost:8080') && !ignoreUsers.includes(splits[1])) {
    axios.post(process.env.FEEDBACK_ENDPOINT, {
      key: process.env.DISCORD_KEY,
      cid: process.env.DISCORD_CID,
      message: msg,
    }, {
      headers: {
        Authorization: `Bearer <>`
      }
    })
    .then(res => {
      callback && callback(null, res);
    })
    .catch(err => {
      callback && callback(err, null);
    });
  }
}