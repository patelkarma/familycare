FROM eclipse-temurin:17-jdk-alpine
WORKDIR /app
COPY .mvn/ .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw
RUN ./mvnw dependency:go-offline
COPY src ./src
RUN ./mvnw clean package -DskipTests
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "java -jar target/backend-0.0.1-SNAPSHOT.jar \
  --server.port=${PORT:-8080} \
  --spring.datasource.url=$SPRING_DATASOURCE_URL \
  --spring.datasource.username=$SPRING_DATASOURCE_USERNAME \
  --spring.datasource.password=$SPRING_DATASOURCE_PASSWORD \
  --spring.data.redis.url=$SPRING_DATA_REDIS_URL \
  --jwt.secret=$JWT_SECRET \
  --jwt.expiration=$JWT_EXPIRATION \
  --cloudinary.cloud-name=$CLOUDINARY_CLOUD_NAME \
  --cloudinary.api-key=$CLOUDINARY_API_KEY \
  --cloudinary.api-secret=$CLOUDINARY_API_SECRET \
  --gemini.api-key=$GEMINI_API_KEY \
  --gemini.model=${GEMINI_MODEL:-gemini-2.0-flash} \
  --twilio.account-sid=$TWILIO_ACCOUNT_SID \
  --twilio.auth-token=$TWILIO_AUTH_TOKEN \
  --twilio.whatsapp-sandbox-code=${TWILIO_WHATSAPP_SANDBOX_CODE:-degree-idea} \
  --twilio.webhook-verify=${TWILIO_WEBHOOK_VERIFY:-true} \
  --app.public-base-url=${PUBLIC_BASE_URL:-} \
  --FRONTEND_URL=${FRONTEND_URL:-http://localhost:5173}"]
