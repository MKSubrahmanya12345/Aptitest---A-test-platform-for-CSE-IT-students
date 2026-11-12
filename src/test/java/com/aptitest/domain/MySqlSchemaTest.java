package com.aptitest.domain;

import java.io.StringWriter;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import org.hibernate.boot.MetadataSources;
import org.hibernate.boot.model.naming.CamelCaseToUnderscoresNamingStrategy;
import org.hibernate.boot.registry.StandardServiceRegistryBuilder;
import org.hibernate.dialect.DatabaseVersion;
import org.hibernate.dialect.MySQLDialect;
import org.hibernate.tool.schema.spi.SchemaManagementToolCoordinator;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

class MySqlSchemaTest {
    @ParameterizedTest
    @ValueSource(ints = {1, 2, 3, 4})
    void questionTextUsesLongtextRegardlessOfConnectionCharset(int bytesPerCharacter) {
        // The connection charset can differ from an existing utf8mb4 database/table.
        // Generate MySQL DDL without a connection so H2 cannot mask this regression.
        StringWriter ddl = new StringWriter();
        Map<String, Object> settings = new HashMap<>();
        settings.put("hibernate.dialect", new MySQLDialect(DatabaseVersion.make(8, 0), bytesPerCharacter));
        settings.put("hibernate.boot.allow_jdbc_metadata_access", false);
        settings.put("jakarta.persistence.schema-generation.database.action", "none");
        settings.put("jakarta.persistence.schema-generation.scripts.action", "create");
        settings.put("jakarta.persistence.schema-generation.scripts.create-target", ddl);
        settings.put("hibernate.hbm2ddl.halt_on_error", true);

        var registry = new StandardServiceRegistryBuilder().applySettings(settings).build();
        try {
            var metadata = new MetadataSources(registry)
                .addAnnotatedClass(AppUser.class)
                .addAnnotatedClass(Question.class)
                .addAnnotatedClass(TestTemplate.class)
                .addAnnotatedClass(TestAttempt.class)
                .addAnnotatedClass(AttemptQuestion.class)
                .addAnnotatedClass(PaymentRecord.class)
                .getMetadataBuilder()
                .applyPhysicalNamingStrategy(new CamelCaseToUnderscoresNamingStrategy())
                .build();
            SchemaManagementToolCoordinator.process(metadata, registry, settings, action -> {});

            String questionTable = Arrays.stream(ddl.toString().split(";"))
                .map(String::trim)
                .filter(sql -> sql.startsWith("create table at_questions ("))
                .findFirst().orElseThrow(() -> new AssertionError("Question table DDL was not generated: " + ddl));
            assertThat(questionTable).containsIgnoringCase("question_text longtext not null")
                .doesNotContainIgnoringCase("varchar(20000)");
            assertThat(ddl.toString()).contains("idx_at_questions_filter", "fk_at_attemptquestion_question");
        } finally {
            StandardServiceRegistryBuilder.destroy(registry);
        }
    }
}
