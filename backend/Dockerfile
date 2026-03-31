FROM eclipse-temurin:17-jdk-alpine
WORKDIR /app
COPY .mvn/ .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw
RUN ./mvnw dependency:go-offline
COPY src ./src
RUN ./mvnw clean package -DskipTests
EXPOSE 8080
ENTRYPOINT ["java", \
  "-Dspring.datasource.url=${SPRING_DATASOURCE_URL}", \
  "-Dspring.datasource.username=${SPRING_DATASOURCE_USERNAME}", \
  "-Dspring.datasource.password=${SPRING_DATASOURCE_PASSWORD}", \
  "-Dspring.data.redis.url=${SPRING_DATA_REDIS_URL}", \
  "-Djwt.secret=${JWT_SECRET}", \
  "-Djwt.expiration=${JWT_EXPIRATION}", \
  "-Dcloudinary.cloud-name=${CLOUDINARY_CLOUD_NAME}", \
  "-Dcloudinary.api-key=${CLOUDINARY_API_KEY}", \
  "-Dcloudinary.api-secret=${CLOUDINARY_API_SECRET}", \
  "-Dfast2sms.api-key=${FAST2SMS_API_KEY}", \
  "-Dspring.jpa.hibernate.ddl-auto=none", \
  "-Dspring.jpa.open-in-view=false", \
  "-jar", "target/backend-0.0.1-SNAPSHOT.jar"]