package vn.microtec.mschool.infrastructure.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.microtec.mschool.domain.enums.SubjectType;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateProfileRequest {
    private String fullName;
    private SubjectType subjectType;
    private String departmentOrClass;
    private Double qualityScore;
    private Double laplacianScore;
    private Boolean isActive;
    private String imageBase64;
    private String angleType;
    private List<Double> embeddingPrimary;
    private List<Double> embeddingLeft;
    private List<Double> embeddingRight;
    private List<Double> embeddingPitch;
    private List<Double> embeddingCameraNative;
    private String photoStraight;
    private String photoLeft;
    private String photoRight;
    private String photoPitch;
    private String photoCameraNative;
    private String alignedFaceStraight;
}
