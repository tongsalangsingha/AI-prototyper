rm(list = ls())
cat("--- Environment Reset. Starting Fresh ---\n\n")
# ==========================================
# PART 1: SETUP & PACKAGES
# ==========================================
# Install packages if missing
if (!require("tidyverse", quietly = TRUE)) install.packages("tidyverse")
if (!require("readxl", quietly = TRUE))    install.packages("readxl")
if (!require("writexl", quietly = TRUE))   install.packages("writexl") 

library(tidyverse)
library(readxl) 
library(writexl) 

# ==========================================
# PART 2: DATA CLEANING (วิเคราะห์รายครั้ง - ไม่หาค่าเฉลี่ย)
# ==========================================
cat("Step 1: Cleaning data (by Evaluation)...\n")

# 1. อ่านไฟล์ Excel
input_file <- "Phase2_expert_evaluation_cleaned.xlsx"
if (!file.exists(input_file)) {
  stop(paste("Could not find file:", input_file))
}
raw_data <- read_excel(input_file, sheet = 1)

# 2. ---!!! กำหนดเงื่อนไขใหม่ตามที่คุณต้องการ !!!---
control_systems <- c("S2", "S4", "S5", "S6", "S9", "S10") # (S2 ถูกเพิ่มกลับเข้ามาตามที่คุณขอ)
treat_systems   <- c("S1", "S3", "S7", "S8", "S11")
evaluators_list <- c("P1", "P2", "P3", "P4", "P5") # กรองเฉพาะ P1-P5

# 3. ประมวลผลข้อมูล
processed_data <- raw_data %>%
  # ---!!! กรองเฉพาะผู้ประเมิน P1-P5 จาก Column A !!!---
  filter(Participant_ID %in% evaluators_list) %>%
  
  # เลือกคอลัมน์: 1=ID, 4=System, 5=MetricNum, 7=Rating
  select(1, 4, 5, 7) %>%
  set_names(c("eval_id", "system_label", "metric_num", "rating")) %>%
  mutate(system_label = str_trim(system_label)) %>%
  
  # แบ่งกลุ่ม (Control/Treat)
  mutate(
    group = case_when(
      system_label %in% control_systems ~ "Control",
      system_label %in% treat_systems   ~ "Treatment",
      TRUE ~ NA_character_
    )
  ) %>%
  # กรอง S ที่ไม่อยู่ในลิสต์ออก (เช่น S2)
  filter(!is.na(group)) %>%
  
  # Map 1-9 ไปเป็น A-I
  mutate(
    metric_letter = case_when(
      metric_num == 1 ~ "A", metric_num == 2 ~ "B", metric_num == 3 ~ "C",
      metric_num == 4 ~ "D", metric_num == 5 ~ "E", metric_num == 6 ~ "F",
      metric_num == 7 ~ "G", metric_num == 8 ~ "H", metric_num == 9 ~ "I"
    )
  )

# 4. ---!!! PIVOT (แปลง 9 แถวเป็น 9 คอลัมน์) !!!---
# (นี่คือตรรกะ "ไม่หาค่าเฉลี่ย")
wide_data <- processed_data %>%
  pivot_wider(
    names_from = metric_letter, # สร้าง Columns A, B, C...
    values_from = rating,       # เติมค่าด้วย Rating (เลขจำนวนเต็ม)
    
    # --- นี่คือหัวใจสำคัญ (ไม่หาค่าเฉลี่ย) ---
    # เราสร้าง 1 แถว ต่อ 1 การประเมิน (ID + System)
    id_cols = c(eval_id, group, system_label) 
    # (เราลบ values_fn = mean ออกไปแล้ว)
  )

# 5. สร้าง Dataframes
# (เก็บ eval_id และ system_label ไว้เพื่อ Export)
control_df <- wide_data %>% 
  filter(group == "Control") 

treat_df   <- wide_data %>% 
  filter(group == "Treatment")

cat("Data cleaning successful (By Evaluation).\n")
cat("Rows in Control:", nrow(control_df), "\n")
cat("Rows in Treatment:", nrow(treat_df), "\n")

# --- Export ข้อมูลดิบที่ล้างแล้ว (Raw Cleaned Data) ---
cat("\nExporting raw cleaned data to Excel...\n")
cleaned_data_list <- list(
  "Control_Group_Raw" = control_df,
  "Treat_Group_Raw" = treat_df
)
write_xlsx(cleaned_data_list, "cleaned_data_BY_EVALUATION.xlsx")
cat("Cleaned data saved to 'cleaned_data_BY_EVALUATION.xlsx'\n")


# ==========================================
# PART 3: STATISTICAL ANALYSIS
# ==========================================
cat("\nStep 2: Running Statistical Analysis...\n")

# (เราต้องลบ eval_id, group, system_label ออกก่อนส่งไปวิเคราะห์)
analysis_control_df <- control_df %>% select(A:I)
analysis_treat_df   <- treat_df %>% select(A:I)

column_titles <- c("A: Funct Req.", "B: Nec. Comp.", "C: Clear & Appr.", 
                   "D: Design Const.", "E: Visual Desg.", "F: Inf. Orga", 
                   "G: Easy Inter.", "H: Mini. Error", "I: Overall Sats.")
columns <- c("A", "B", "C", "D", "E", "F", "G", "H", "I")

results_list <- list()

for (i in 1:length(columns)) {
  col <- columns[i]
  
  c_vals <- na.omit(analysis_control_df[[col]])
  t_vals <- na.omit(analysis_treat_df[[col]])
  
  if (length(c_vals) > 0 & length(t_vals) > 0) {
    # Wilcoxon Test
    test_result <- wilcox.test(c_vals, t_vals, paired = FALSE, conf.int = TRUE)
    
    # Statistics
    p_val <- test_result$p.value
    conf_int <- round(test_result$conf.int, 3)
    med_control <- median(c_vals)
    med_treat <- median(t_vals)
    mean_control <- round(mean(c_vals), 3)
    mean_treat <- round(mean(t_vals), 3)
    
    # Effect Size (Cohen's r)
    z <- qnorm(p_val / 2)
    N <- length(c_vals) + length(t_vals)
    r_effect_size <- round(abs(z) / sqrt(N), 3)
    
    # เก็บผลลัพธ์ (ใช้ p_val ตัวเลขดิบ)
    results_list[[col]] <- tibble(
      Metric = column_titles[i],
      Control_Median = med_control,
      Treat_Median = med_treat,
      Control_Mean = mean_control,
      Treat_Mean = mean_treat,
      P_Value = p_val,
      CI_Low = conf_int[1],
      CI_High = conf_int[2],
      Effect_Size_r = r_effect_size
    )
    
    # พิมพ์ผลลัพธ์ (ใช้ p_val ที่จัดรูปแบบ)
    cat("\n-------------------------------------\n")
    cat("Title: ", column_titles[i], "\n")
    cat("Control group median: ", med_control, "\n")
    cat("Treatment group median: ", med_treat, "\n")
    cat("Control group mean: ", mean_control, "\n")
    cat("Treatment group mean: ", mean_treat, "\n")
    cat("P-value: ", formatC(p_val, format = "e", digits = 4), "\n") 
    cat("Confidence interval: [", conf_int[1], ", ", conf_int[2], "]\n")
    cat("Cohen's r (effect size): ", r_effect_size, "\n")
    
  } else {
    cat("\nSkipping metric", col, "due to missing data.\n")
  }
}
cat("\nDone.\n")


# ==========================================
# PART 4: FORMAT & EXPORT RESULTS TO EXCEL FILE
# ==========================================
if (length(results_list) > 0) {
  final_results_df <- bind_rows(results_list)
  
  cat("\nStep 3: Transposing results table for export...\n")
  
  # สลับแถวกับคอลัมน์
  results_long <- final_results_df %>%
    pivot_longer(cols = -Metric, names_to = "Statistic", values_to = "Value")
    
  results_transposed <- results_long %>%
    pivot_wider(names_from = Metric, values_from = Value)

  # Export
  output_filename <- "statistical_analysis_BY_EVALUATION.xlsx"
  write_xlsx(results_transposed, output_filename)
  
  cat("\n==========================================\n")
  cat("Success! Results exported to:", output_filename, "\n")
  cat("==========================================\n")
  
} else {
  cat("\nNo results were generated to export.\n")
}