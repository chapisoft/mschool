package vn.microtec.mschool;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableAsync
public class MSchoolApplication {

    public static void main(String[] args) {
        SpringApplication.run(MSchoolApplication.class, args);
    }
}
