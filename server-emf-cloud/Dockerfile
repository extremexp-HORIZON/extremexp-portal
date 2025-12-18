FROM eclipse-temurin:17-jdk

COPY . /server-emf-cloud
WORKDIR /server-emf-cloud

COPY . .

WORKDIR /server-emf-cloud/
ENV PORT 8081
EXPOSE 8081

ENTRYPOINT [ "java", "-jar", "org.eclipse.emfcloud.modelserver.example-0.7.0-SNAPSHOT-standalone.jar" ]
