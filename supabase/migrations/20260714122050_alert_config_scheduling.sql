-- Add dedicated scheduling columns to alert_config
ALTER TABLE alert_config ADD COLUMN schedule_hour INTEGER CHECK (schedule_hour >= 0 AND schedule_hour <= 23);
ALTER TABLE alert_config ADD COLUMN schedule_day_of_week INTEGER CHECK (schedule_day_of_week >= 0 AND schedule_day_of_week <= 6);

-- Migrate existing report configs that overloaded threshold_value
UPDATE alert_config
SET schedule_hour = threshold_value::INTEGER,
    schedule_day_of_week = 0, -- Default weekly reports to Monday
    threshold_value = NULL
WHERE event_type LIKE 'report:%';
