ALTER TABLE `payments`
  ADD COLUMN `providerOrderId` varchar(128) UNIQUE;
