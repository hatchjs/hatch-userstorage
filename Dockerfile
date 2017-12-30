FROM registry.cn-shenzhen.aliyuncs.com/hatch/basenode:lastest

ENV APPDIR /usr/local/app
WORKDIR ${APPDIR}
COPY package.json /usr/src/app/package.json
RUN npm i --registry=https://registry.npm.taobao.org
COPY . /usr/src/app
EXPOSE 7001
CMD npm start

