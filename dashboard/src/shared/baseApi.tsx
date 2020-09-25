import axios from 'axios';

// Partial function that accepts a generic params type and returns an api method
export const baseApi = <T extends {}>(requestType: string, endpoint: string) => {
  if (requestType === 'POST') {
    return (token: string, params?: T, callback?: (err: any, res: any) => void) => {
      axios.post(`https://${process.env.API_SERVER + endpoint}`, params, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      .then(res => {
        callback && callback(null, res.data);
      })
      .catch(err => {
        callback && callback(err, null);
      });
    };
  }

  return (token: string, params?: T, callback?: (err: any, res: any) => void) => {
    axios.get(`https://${process.env.API_SERVER + endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      params
    })
    .then(res => {
      callback && callback(null, res.data);
    })
    .catch(err => {
      callback && callback(err, null);
    });
  };
}