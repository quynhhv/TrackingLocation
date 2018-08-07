import ApiConfig from './config';


let accessToken = null;
let renewalToken = null;

export const authApi =  {
    setAccessToken: (access, renewal) => {
        accessToken = access;
        renewalToken = renewal;
    },
    authEmailOrUser : (params) => loginEmailOrUser(ApiConfig.methodPost, "/airmarket-dispatcher/auth", params)
}

const loginEmailOrUser = async (method, path, data) => {
    console.log('loginEmailOrUser',method, path, data);
    const response = await request({method, path, data});
    console.log('response loginEmailOrUser' + response);
    if (response && response.token) {
        authApi.setAccessToken(response.token, "");
    } else {
        authApi.setAccessToken(null, null);
    }
    console.log("token",accessToken);
    return response;
}

export const productApi = {
    realtimeLocation : (data) => realtimeLocationToServer(ApiConfig.methodPost, "/api/locations/",data)
}
// const newProductToServer = async (method, path, data) => {
//     const response = await request({method, path, data});
//     console.log('response newProduct' + response);
//     return response;
// }
// const productByLocation = async (method, path, data) => {

// }
const realtimeLocationToServer = async (method, path, data) => {
    const response = await request({method, path, data});
    console.log('response realtime location' + response);
    return response;
}


const request = async (params = {}) => {
    const headers = accessToken
        ? {
            'Content-Type': 'application/json',
            'x-access-token': `${accessToken}`
        }
        : {
            'Content-Type': 'application/json'
        };
        let response = null;
        let responseData = null;
        try {
            console.log('data request', JSON.stringify(params.data));
            const url = ApiConfig.host + params.path;
            console.log(url);
            response = await fetch(`${url}`, {
                headers: headers,
                method: params.method,
                body: params.data ? JSON.stringify(params.data) : null
            });
            
            response.type = "json";
            responseData = await response.json();
            console.log("request",responseData);
        } catch (error) {
            console.log(error);
            debugger
        }

        if(response != null){
            if(response.ok){
                return responseData;
            }
            if(response.status ==  401) {
                // renew token
                let error = new Error(response.statusText);
                error.response = response;
                throw error;
            }
        }else {
            let error = new Error("can not get");
                error.status = 500;
                throw error;
        }
        
}
