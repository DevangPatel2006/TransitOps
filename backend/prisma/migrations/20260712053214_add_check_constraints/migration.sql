-- Add CHECK constraints for vehicles, drivers, trips, maintenance logs, fuel logs, and expenses
ALTER TABLE vehicles
  ADD CONSTRAINT chk_vehicles_max_load_capacity_positive CHECK (max_load_capacity > 0),
  ADD CONSTRAINT chk_vehicles_odometer_nonnegative CHECK (odometer >= 0),
  ADD CONSTRAINT chk_vehicles_acquisition_cost_nonnegative CHECK (acquisition_cost >= 0);

ALTER TABLE drivers
  ADD CONSTRAINT chk_drivers_safety_score_range CHECK (safety_score BETWEEN 0 AND 100);

ALTER TABLE trips
  ADD CONSTRAINT chk_trips_cargo_weight_positive CHECK (cargo_weight > 0),
  ADD CONSTRAINT chk_trips_planned_distance_positive CHECK (planned_distance > 0),
  ADD CONSTRAINT chk_trips_actual_distance_nonnegative CHECK (actual_distance IS NULL OR actual_distance >= 0),
  ADD CONSTRAINT chk_trips_fuel_consumed_nonnegative CHECK (fuel_consumed IS NULL OR fuel_consumed >= 0),
  ADD CONSTRAINT chk_trips_revenue_nonnegative CHECK (revenue IS NULL OR revenue >= 0);

ALTER TABLE maintenance_logs
  ADD CONSTRAINT chk_maintenance_cost_nonnegative CHECK (cost >= 0);

ALTER TABLE fuel_logs
  ADD CONSTRAINT chk_fuel_logs_liters_positive CHECK (liters > 0),
  ADD CONSTRAINT chk_fuel_logs_cost_nonnegative CHECK (cost >= 0);

ALTER TABLE expenses
  ADD CONSTRAINT chk_expenses_amount_nonnegative CHECK (amount >= 0);