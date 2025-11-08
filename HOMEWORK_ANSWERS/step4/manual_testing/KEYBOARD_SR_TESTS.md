# Manual Accessibility Test Results

**Date:** [Date]
**Tester:** [Name]
**URL:** http://localhost:5173

## Keyboard Navigation
- Status: ✅ Pass / ❌ Fail
- Issues:
    * With Tab, on active elements, there's no feedback to know it is focusing
    * Can't navigate through products buy buttons in product page
    * In contact page, when focusing on submit form button, can´t see feedback indicator that indicates that the Tab is now focusing on it.

## Screen Reader
- Status: ✅ Pass / ❌ Fail  
- Screen Reader Used: NVDA / VoiceOver / Other
- Issues:
    * Could not use screen reader in any page

## Summary
The manual accessibility test identified several issues:
- Keyboard navigation does not provide visible focus indicators on active elements, making it difficult for users to see where focus is.
- It is not possible to navigate to the "buy" buttons for products using the keyboard on the product page.
- On the contact page, the submit button does not show any focus feedback when selected with Tab.
- Screen reader testing was unsuccessful on all pages, indicating major issues with screen reader compatibility or support.

Overall, the application has significant accessibility shortcomings for both keyboard and screen reader users.
