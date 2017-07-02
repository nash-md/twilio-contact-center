#
# twilio-contact-center web server
#
FROM node:8.1.1
LABEL vendor="KDDI Web Communications inc." \
    maintainer="yuto.yamada@kddi-web.com"

# open port
EXPOSE 5000

WORKDIR /www/twilio-contact-center

# exec after container run
COPY ./docker-entrypoint.sh /usr/local/bin/
RUN chmod 755 /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "start"]
